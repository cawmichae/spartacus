import {
  formatNumber,
  getLocaleNumberSymbol,
  NumberSymbol,
} from '@angular/common';
import { Injectable } from '@angular/core';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { Configurator } from '../../../../core/model/configurator.model';

export interface ConfiguratorAttributeNumericInterval {
  minValue?: number;
  maxValue?: number;
  minValueIncluded?: boolean;
  maxValueIncluded?: boolean;
}

/**
 * Provides validation and formatting of numeric input
 */
@Injectable({ providedIn: 'root' })
export class ConfiguratorAttributeNumericInputFieldService {
  /**
   * Validates numeric input according to settings that are not derived from the locale but from the attribute
   * meta data like the total number of digits and the maximum number of decimal places.
   *
   * @param input Numeric user input, formatted according to session locale
   * @param groupingSeparator Separator for grouping, e.g. ',' for 'en' locale. We allow the grouping separator but
   *   do not check exactly on the position of it in the numerical input. This e.g. is ok: '12,12,12', will be converted
   *   to '121,212' after the next roundtrip
   * @param decimalSeparator  Decimal separator, e.g. '.' for 'en' locale. Must not occur more that 1 time in the input.
   * @param numberTotalPlaces  Total number of places e.g. 10
   * @param numberDecimalPlaces  Number of decimal places e.g. 2
   *  @returns {boolean} Did we see a validation error?
   */
  performValidationAccordingToMetaData(
    input: string,
    groupingSeparator: string,
    decimalSeparator: string,
    numberTotalPlaces: number,
    numberDecimalPlaces: number
  ): boolean {
    const escape = '\\';
    const search: RegExp = new RegExp(escape + groupingSeparator, 'g');
    const woGrouping = input.replace(search, '');
    const splitParts = woGrouping.split(decimalSeparator);

    if (splitParts.length > 2) {
      return true;
    }
    if (splitParts.length === 1) {
      return woGrouping.length > numberTotalPlaces - numberDecimalPlaces;
    }

    return (
      splitParts[0].length > numberTotalPlaces - numberDecimalPlaces ||
      splitParts[1].length > numberDecimalPlaces
    );
  }
  /**
   *
   * @param values
   */
  getIntervalHelpText(
    values: Configurator.Value[] | undefined
  ): string | undefined {
    let helpText: string | undefined;
    if (values && values.length > 0) {
      helpText = '';
      values.forEach((value) => (helpText += value.name + ' ; '));
      helpText = helpText.slice(0, -3); //remove last semicolon
    }
    return helpText;
  }

  getIntervals(
    values: Configurator.Value[] | undefined
  ): ConfiguratorAttributeNumericInterval[] | undefined {
    let intervals: ConfiguratorAttributeNumericInterval[] | undefined;
    if (values && values.length > 0) {
      intervals = [];
      values.forEach((value) => intervals.push(this.getInterval(value)));
    }
    return intervals;
  }

  getInterval(value: Configurator.Value): ConfiguratorAttributeNumericInterval {
    let interval: ConfiguratorAttributeNumericInterval = {};
    let index = value?.name.indexOf(' - ');
    let minVal: string = '';
    let maxVal: string = '';
    let minValIncluded = true;
    let maxValIncluded = true;
    if (value && value.name) {
      // standard interval a - b
      if (value.name.includes(' - ')) {
        minVal = value.name.substring(0, index);
        maxVal = value.name.substring(index + 3, value.name.length);
        if (minVal.includes('>')) {
          minValIncluded = false;
          minVal = minVal.replace('>', '');
        }

        if (maxVal.includes('<')) {
          maxValIncluded = false;
          maxVal = maxVal.replace('<', '');
        }

        // infinite interval
      } else {
        if (value.name.includes('>')) {
          minVal = value.name;
          minValIncluded = false;
          if (value.name.includes('=')) {
            minVal = minVal.replace('=', '');
            minValIncluded = true;
          }
          minVal = minVal.replace('>', '');
        } else {
          maxVal = value.name;
          maxValIncluded = false;
          if (value.name.includes('=')) {
            maxVal = maxVal.replace('=', '');
            maxValIncluded = true;
          }
          maxVal = maxVal.replace('<', '');
        }
      }
      if (minVal && minVal.length > 0) {
        interval.minValue = +minVal;
      }
      if (maxVal && maxVal.length > 0) {
        interval.maxValue = +maxVal;
      }
      interval.minValueIncluded = minValIncluded;
      interval.maxValueIncluded = maxValIncluded;
    }
    return interval;
  }

  /**
   * Get pattern for the message that is displayed when the validation fails. This message e.g. looks like
   * 'Wrong format, this numerical attribute should be entered according to pattern ##,###,###.##'
   * for the 'en' locale for an attribute with total length of 10 and 2 decimal places.
   *
   * @param decimalPlaces Number of decimal places
   * @param totalLength Total number of digits
   * @param negativeAllowed Do we allow negative input?
   * @param locale  Locale
   *  @returns {string} The pattern that we display in the validation message
   */
  getPatternForValidationMessage(
    decimalPlaces: number,
    totalLength: number,
    negativeAllowed: boolean,
    locale: string
  ): string {
    let input: string = (10 ** totalLength - 1).toString();
    if (decimalPlaces > 0) {
      input =
        input.substring(0, totalLength - decimalPlaces) +
        '.' +
        input.substring(totalLength - decimalPlaces, totalLength);
    }
    const inputAsNumber: number = Number(input);
    let formatted = formatNumber(
      inputAsNumber,
      locale,
      '1.' + decimalPlaces + '-' + decimalPlaces
    ).replace(/9/g, '#');
    if (negativeAllowed) {
      formatted = '-' + formatted;
    }
    return formatted;
  }

  /**
   * Returns the validator for the input component that represents numeric input.
   * The validator only allows the grouping separator, the decimal separator, an optional '-' sign,
   * and the digits between 0..9. This validator does not support the scientific notation of
   * attributes.
   *
   * @param locale The locale
   * @param numberDecimalPlaces Number of decimal places
   * @param numberTotalPlaces  Total number of digits
   * @param negativeAllowed: Do we allow negative input?
   * @returns {ValidatorFn} The validator
   */

  getNumberFormatValidator(
    locale: string,
    numberDecimalPlaces: number,
    numberTotalPlaces: number,
    negativeAllowed: boolean
  ): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const input: string = control.value;
      if (input) {
        //allowed: only numbers and separators

        const groupingSeparator = getLocaleNumberSymbol(
          locale,
          NumberSymbol.Group
        );
        const decimalSeparator = getLocaleNumberSymbol(
          locale,
          NumberSymbol.Decimal
        );
        const expressionPrefix = negativeAllowed ? '^-?' : '^';
        const expressionOnlyNumericalInput: RegExp = new RegExp(
          expressionPrefix +
            '[0123456789' +
            groupingSeparator +
            decimalSeparator +
            ']*$'
        );

        if (!expressionOnlyNumericalInput.test(input)) {
          return this.createValidationError(true);
        }
        return this.createValidationError(
          this.performValidationAccordingToMetaData(
            input,
            groupingSeparator,
            decimalSeparator,
            numberTotalPlaces + (input.includes('-') ? 1 : 0),
            numberDecimalPlaces
          )
        );
      }
      return null;
    };
  }

  protected createValidationError(
    isError: boolean
  ): { [key: string]: any } | null {
    return isError ? { wrongFormat: {} } : null;
  }
}
