import { InjectionToken } from '@angular/core';
import { PointOfService } from '../../../model/point-of-service.model';
import { Converter } from '../../../util/converter.service';

export const POINT_OF_SERVICE_NORMALIZER = new InjectionToken<
  Converter<any, PointOfService>
>('PointOfServiceNormalizer');
