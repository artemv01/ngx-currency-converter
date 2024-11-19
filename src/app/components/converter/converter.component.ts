import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConverterService } from '../../services/converter.service';
import {
  Subject,
  switchMap,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  combineLatest,
  startWith,
  of,
  tap,
} from 'rxjs';

@Component({
  selector: 'app-converter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './converter.component.html',
  styleUrls: ['./converter.component.scss'],
})
export class ConverterComponent implements OnInit, OnDestroy {
  converterForm: FormGroup;
  isLoading = false;
  private destroy$ = new Subject<void>();

  private currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    RUB: '₽',
  };

  constructor(private converterService: ConverterService) {
    this.converterForm = new FormGroup({
      fromCurrency: new FormControl('USD'),
      toCurrency: new FormControl('EUR'),
      fromAmount: new FormControl(0, [Validators.pattern(/^\d*\.?\d*$/)]),
      toAmount: new FormControl(0, [Validators.pattern(/^\d*\.?\d*$/)]),
    });
  }

  getCurrencySymbol(currency: string): string {
    return this.currencySymbols[currency] || currency;
  }

  getErrorMessage(controlName: string): string {
    const control = this.converterForm.get(controlName);
    if (control?.errors?.['pattern']) {
      return 'Please enter a correct number';
    }
    return '';
  }

  switchCurrencies(): void {
    const fromCurrency = this.converterForm.get('fromCurrency')?.value;
    const toCurrency = this.converterForm.get('toCurrency')?.value;

    this.converterForm.patchValue({
      fromCurrency: toCurrency,
      toCurrency: fromCurrency,
    });
  }

  private convertFromTo(from: string, to: string, amount: string) {
    if (amount === '0' || amount === '') {
      this.converterForm.patchValue({ toAmount: '0' }, { emitEvent: false });
      return of(null);
    }
    if (
      this.converterForm.get('fromAmount')?.invalid ||
      this.converterForm.get('toAmount')?.invalid
    ) {
      return of(null);
    }
    return this.converterService.convertFromTo(from, to, amount);
  }

  ngOnInit() {
    this.converterForm
      .get('fromAmount')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => (this.isLoading = true)),
        switchMap(amount =>
          this.convertFromTo(
            this.converterForm.get('fromCurrency')?.value,
            this.converterForm.get('toCurrency')?.value,
            amount
          )
        ),
        tap(() => (this.isLoading = false))
      )
      .subscribe(result => {
        if (result) {
          this.converterForm.patchValue({ toAmount: result }, { emitEvent: false });
        }
      });

    this.converterForm
      .get('toAmount')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => (this.isLoading = true)),
        switchMap(amount =>
          this.convertFromTo(
            this.converterForm.get('toCurrency')?.value,
            this.converterForm.get('fromCurrency')?.value,
            amount
          )
        ),
        tap(() => (this.isLoading = false))
      )
      .subscribe(result => {
        if (result) {
          this.converterForm.patchValue({ fromAmount: result }, { emitEvent: false });
        }
      });

    combineLatest([
      this.converterForm.get('fromCurrency')?.valueChanges.pipe(startWith(null)),
      this.converterForm.get('toCurrency')?.valueChanges.pipe(startWith(null)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        tap(() => (this.isLoading = true)),
        switchMap(() =>
          this.convertFromTo(
            this.converterForm.get('fromCurrency')?.value,
            this.converterForm.get('toCurrency')?.value,
            this.converterForm.get('fromAmount')?.value
          )
        ),
        tap(() => (this.isLoading = false))
      )
      .subscribe(result => {
        if (result) {
          this.converterForm.patchValue({ toAmount: result }, { emitEvent: false });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
