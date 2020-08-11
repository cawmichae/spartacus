import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { I18nModule, UrlModule } from '@spartacus/core';
import { ListNavigationModule } from '../list-navigation/list-navigation.module';
import { Table2Component } from './table2.component';
import { IconModule } from './../../../cms-components/misc/icon/icon.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NgSelectModule,
    ListNavigationModule,
    UrlModule,
    I18nModule,
    IconModule,
  ],
  declarations: [Table2Component],
  exports: [Table2Component],
  entryComponents: [Table2Component],
})
export class Table2Module {}
