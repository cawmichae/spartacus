import { NgModule, InjectionToken, ModuleWithProviders } from '@angular/core';

import {
  StoreRouterConnectingModule,
  RouterStateSerializer
} from '@ngrx/router-store';
import { StoreModule, MetaReducer, META_REDUCERS } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { getStorageSyncReducer } from './store/reducers';
import {
  reducerToken,
  CustomSerializer,
  reducerProvider
} from './store/reducers/router.reducer';
import { effects } from './store/effects/index';
import { RoutingModuleConfig, StorageSyncType } from './routing-module-config';

// not used in production
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { storeFreeze } from 'ngrx-store-freeze';
import { ConfigModule, Configuration } from '../config/config.module';


export function getMetaReducers(
  config: RoutingModuleConfig
): MetaReducer<any>[] {
  const metaReducers: MetaReducer<any>[] = [];
  if (config.storageSyncType !== StorageSyncType.NO_STORAGE) {
    const storageSyncReducer = getStorageSyncReducer(config);
    metaReducers.push(storageSyncReducer);
  }

  metaReducers.push(storeFreeze); // Should not be used in production (SPA-488)

  return metaReducers;
}

@NgModule({
  imports: [
    StoreModule.forRoot(reducerToken),
    EffectsModule.forRoot(effects),
    StoreRouterConnectingModule,
    StoreDevtoolsModule.instrument(), // Should not be used in production (SPA-488)
    ConfigModule.withConfig(new RoutingModuleConfig())
  ],
  providers: [
    reducerProvider,
    {
      provide: RouterStateSerializer,
      useClass: CustomSerializer
    },
    RoutingModuleConfig,
    {
      provide: META_REDUCERS,
      deps: [RoutingModuleConfig],
      useFactory: getMetaReducers
    },
    {
      provide: RoutingModuleConfig,
      useExisting: Configuration
    }
  ]
})
export class RoutingModule {}
