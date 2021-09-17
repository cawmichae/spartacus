/* webpackIgnore: true */
import { Request, Response } from 'express';
import * as fs from 'fs';
import { NgExpressEngineInstance } from '../engine-decorator/ng-express-engine-decorator';
import { RenderingCache } from './rendering-cache';
import {
  RenderingStrategy,
  SsrOptimizationOptions,
} from './ssr-optimization-options';

class SsrRequest {
  constructor(
    public filePath: string,
    public options: any,
    public renderCallback: SsrCallbackFn
  ) {}

  get request(): Request {
    return this.options.req;
  }
}

export type SsrCallbackFn = (
  /**
   * Error that might've occurred while rendering.
   */
  err?: Error | null | undefined,
  /**
   * HTML response.
   */
  html?: string | undefined
) => void;

/**
 * The rendered pages are kept in memory to be served on next request. If the `cache` is set to `false`, the
 * response is evicted as soon as the first successful response is successfully returned.
 */
export class OptimizedSsrEngine {
  protected currentConcurrency = 0;
  protected renderingCache = new RenderingCache(this.ssrOptions);
  private templateCache = new Map<string, string>();

  /**
   * When the config `reuseCurrentRendering` is enabled, we want perform
   * only one render for one rendering key and reuse the html result
   * for all the pending requests for the same rendering key.
   * Therefore we need to store the callbacks for all the pending requests
   * and invoke them with the html after the render completes.
   *
   * This Map should be used only when `reuseCurrentRendering` config is enabled.
   * It's indexed by the rendering keys.
   */
  private waitingRequests = new Map<string, SsrRequest[]>();

  get engineInstance(): NgExpressEngineInstance {
    return this.renderResponse.bind(this);
  }

  constructor(
    protected expressEngine: NgExpressEngineInstance,
    protected ssrOptions?: SsrOptimizationOptions
  ) {}

  /**
   * When SSR page can not be returned in time, we're returning index.html of
   * the CSR application.
   * The CSR application is returned with the "Cache-Control: no-store" response-header. This notifies external cache systems to not use the CSR application for the subsequent request.
   */
  protected fallbackToCsr(
    response: Response,
    filePath: string,
    callback: SsrCallbackFn
  ): void {
    response.set('Cache-Control', 'no-store');
    callback(undefined, this.getDocument(filePath));
  }

  protected getRenderingKey(request: Request): string {
    return this.ssrOptions?.renderKeyResolver
      ? this.ssrOptions.renderKeyResolver(request)
      : request.originalUrl;
  }

  protected getRenderingStrategy(request: Request): RenderingStrategy {
    return this.ssrOptions?.renderingStrategyResolver
      ? this.ssrOptions.renderingStrategyResolver(request)
      : RenderingStrategy.DEFAULT;
  }

  /**
   * When returns true, the server side rendering should be performed.
   * When returns false, the CSR fallback should be returned.
   *
   * We should not render, when there is already
   * a pending rendering for the same rendering key
   * (unless the `reuseCurrentRendering` config option is enabled)
   * OR when the concurrency limit is exceeded.
   */
  protected shouldRender(request: Request): boolean {
    const concurrencyLimitExceeded = this.isConcurrencyLimitExceeded();

    const fallBack =
      this.isRendering(request) && !this.ssrOptions?.reuseCurrentRendering;
    if (fallBack) {
      this.log(`CSR fallback: rendering in progress (${request?.originalUrl})`);
    } else if (concurrencyLimitExceeded) {
      this.log(
        `CSR fallback: Concurrency limit exceeded (${this.ssrOptions?.concurrency})`
      );
    }

    return (
      (!fallBack &&
        !concurrencyLimitExceeded &&
        this.getRenderingStrategy(request) !== RenderingStrategy.ALWAYS_CSR) ||
      this.getRenderingStrategy(request) === RenderingStrategy.ALWAYS_SSR
    );
  }

  /**
   * Returns true, if at this moment there is a pending render for the given rendering key.
   * Otherwise, returns false.
   */
  protected isRendering(request: Request): boolean {
    return this.renderingCache.isRendering(this.getRenderingKey(request));
  }

  /**
   * Checks for the concurrency limit
   *
   * @returns true if the concurrency limit has been exceeded
   */
  protected isConcurrencyLimitExceeded(): boolean {
    return this.ssrOptions?.concurrency
      ? this.currentConcurrency >= this.ssrOptions.concurrency
      : false;
  }

  /**
   * Returns true, when the `timeout` option has been configured to non-zero value OR
   * when the rendering strategy for the given request is ALWAYS_SSR.
   * Otherwise, it returns false.
   */
  protected shouldTimeout(request: Request): boolean {
    return (
      !!this.ssrOptions?.timeout ||
      this.getRenderingStrategy(request) === RenderingStrategy.ALWAYS_SSR
    );
  }

  /**
   * Returns the timeout value.
   *
   * In case of the rendering strategy ALWAYS_SSR, it returns the config `forcedSsrTimeout`.
   * Otherwise, it returns the config `timeout`.
   */
  protected getTimeout(request: Request): number {
    return this.getRenderingStrategy(request) === RenderingStrategy.ALWAYS_SSR
      ? this.ssrOptions?.forcedSsrTimeout ?? 60000
      : this.ssrOptions?.timeout ?? 0;
  }

  /**
   * If there is an available cached response for this rendering key,
   * it invokes the given render callback with the response and returns true.
   *
   * Otherwise, it returns false.
   */
  protected returnCachedRender(
    request: Request,
    callback: SsrCallbackFn
  ): boolean {
    const key = this.getRenderingKey(request);

    if (this.renderingCache.isReady(key)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cached = this.renderingCache.get(key)!;
      callback(cached.err, cached.html);

      if (!this.ssrOptions?.cache) {
        // we drop cached rendering if caching is disabled
        this.renderingCache.clear(key);
      }
      return true;
    }
    return false;
  }

  /**
   * Handles the request and invokes the given `callback` with the result html / error.
   *
   * The result might be ether:
   * - a CSR fallback with a basic `index.html` content
   * - a result rendered by the original Angular Universal express engine
   * - a result from the in-memory cache (which was previously rendered by Angular Universal express engine).
   */
  protected renderResponse(
    filePath: string,
    options: any,
    callback: SsrCallbackFn
  ): void {
    const request: Request = options.req;
    const response: Response = options.res || options.req.res;

    if (this.returnCachedRender(request, callback)) {
      this.log(`Render from cache (${request?.originalUrl})`);
      return;
    }
    if (!this.shouldRender(request)) {
      this.fallbackToCsr(response, filePath, callback);
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    if (this.shouldTimeout(request)) {
      // establish timeout for rendering
      const timeout = this.getTimeout(request);
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        this.fallbackToCsr(response, filePath, callback);
        this.log(
          `SSR rendering exceeded timeout ${timeout}, fallbacking to CSR for ${request?.originalUrl}`,
          false
        );
      }, timeout);
    } else {
      // Here we respond with the fallback to CSR, but we don't `return`.
      // We let the actual rendering task to happen in the background
      // to eventually store the rendered result in the cache.
      this.fallbackToCsr(response, filePath, callback);
    }

    const renderCallback: SsrCallbackFn = (err, html) => {
      const renderingKey = this.getRenderingKey(request);

      if (timeoutId) {
        // if request is still waiting for render, return it
        clearTimeout(timeoutId);
        callback(err, html);

        // store the render only if caching is enabled
        if (this.ssrOptions?.cache) {
          this.renderingCache.store(renderingKey, err, html);
        } else {
          this.renderingCache.clear(renderingKey);
        }
      } else {
        // store the render for future use
        this.renderingCache.store(renderingKey, err, html);
      }
    };

    let ssrRequest = new SsrRequest(filePath, options, renderCallback);

    this.handleRender(ssrRequest);
  }

  protected log(message: string, debug = true): void {
    if (!debug || this.ssrOptions?.debug) {
      console.log(message);
    }
  }

  /** Retrieve the document from the cache or the filesystem */
  protected getDocument(filePath: string): string {
    let doc = this.templateCache.get(filePath);

    if (!doc) {
      // fs.readFileSync could be missing in a browser, specifically
      // in a unit tests with { node: { fs: 'empty' } } webpack configuration
      doc = fs?.readFileSync ? fs.readFileSync(filePath, 'utf-8') : '';
      this.templateCache.set(filePath, doc);
    }

    return doc;
  }

  /**
   * Delegates the render to the original _Angular Universal express engine_.
   *
   * In case when the config `reuseCurrentRendering` is enabled and **if there is already a pending
   * render task for the same rendering key**, it doesn't delegate a new render to Angular Universal.
   * Instead, it waits for the current rendering to complete and then reuse the result for all waiting requests.
   */
  private handleRender(ssrRequest: SsrRequest): void {
    if (!this.ssrOptions?.reuseCurrentRendering) {
      this.startRender(ssrRequest);
      return;
    }

    const renderingKey = this.getRenderingKey(ssrRequest.request);
    const isFirstRequestForKey = !this.renderingCache.isRendering(renderingKey);

    if (!this.waitingRequests.has(renderingKey)) {
      this.waitingRequests.set(renderingKey, []);
    }

    this.waitingRequests.get(renderingKey)?.push(ssrRequest);

    if (isFirstRequestForKey) {
      this.startRender({
        filePath,
        options,
        request,
        renderCallback: (err, html) => {
          // Share the result of the render with all awaiting requests for the same key:

          // Note: we access the Map at the moment of the render finished (don't store value in a local variable),
          //       because in the meantime something might have deleted the value (i.e. when `maxRenderTime` passed).
          this.waitingRequests
            .get(renderingKey)
            ?.forEach((waitingRequest) =>
              waitingRequest.renderCallback(err, html)
            ); // pass the shared result to all waiting rendering callbacks
          this.waitingRequests.delete(renderingKey);
        },
      });
    }

    const renderCallbacksCount = this.waitingRequests.get(renderingKey)?.length;
    this.log(
      `${renderCallbacksCount} requests waiting for the render to complete (${request?.originalUrl})`
    );
  }

  private startRender(ssrRequest: SsrRequest): void {
    const renderingKey = this.getRenderingKey(request);

    // Setting the timeout for hanging renders that might not ever finish due to various reasons.
    // After the configured `maxRenderTime` passes, we consider the rendering task as hanging,
    // and release the concurrency slot.
    // Even if the rendering task completes in the future in the background, we will ignore its result.
    let maxRenderTimeout: NodeJS.Timeout | undefined = setTimeout(() => {
      maxRenderTimeout = undefined;
      this.renderingCache.clear(renderingKey);
      this.waitingRequests.delete(renderingKey);
      this.currentConcurrency--;
      this.log(
        `Rendering of ${request?.originalUrl} was not able to complete. This might cause memory leaks!`,
        false
      );
    }, this.ssrOptions?.maxRenderTime ?? 300000); // 300000ms == 5 minutes

    this.log(`Rendering started (${request?.originalUrl})`);
    this.renderingCache.setAsRendering(renderingKey);
    this.currentConcurrency++;
    this.expressEngine(filePath, options, (err, html) => {
      if (!maxRenderTimeout) {
        // ignore this render's result because it exceeded maxRenderTimeout
        this.log(
          `Rendering of ${request.originalUrl} completed after the specified maxRenderTime, therefore it was ignored.`
        );
        return;
      }

      clearTimeout(maxRenderTimeout);
      this.currentConcurrency--;

      renderCallback(err, html);
    });
  }
}
