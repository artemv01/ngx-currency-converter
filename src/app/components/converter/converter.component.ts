import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    CurrencyPipe,
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

  constructor(
    private fb: FormBuilder,
    private converterService: ConverterService,
    private cdRef: ChangeDetectorRef
  ) {
    this.converterForm = new FormGroup({
      fromCurrency: new FormControl('USD'),
      toCurrency: new FormControl('EUR'),
      fromAmount: new FormControl(0),
      toAmount: new FormControl(0),
    });
  }

  getCurrencySymbol(currency: string): string {
    return this.currencySymbols[currency] || currency;
  }

  switchCurrencies(): void {
    const fromCurrency = this.converterForm.get('fromCurrency')?.value;
    const toCurrency = this.converterForm.get('toCurrency')?.value;

    this.converterForm.patchValue({
      fromCurrency: toCurrency,
      toCurrency: fromCurrency,
    });
  }

  onAmountInput(event: Event, inputType: 'fromAmount' | 'toAmount'): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(value);
    this.converterForm.patchValue({ [inputType]: numericValue || 0 });
  }

  private convertFromTo(from: string, to: string, amount: number) {
    if (!amount || amount === 0) {
      this.converterForm.patchValue({ toAmount: 0 }, { emitEvent: false });
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
        tap(() => ((this.isLoading = true), this.cdRef.markForCheck())),
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
        this.cdRef.markForCheck();
      });
    this.converterForm
      .get('toAmount')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => ((this.isLoading = true), this.cdRef.markForCheck())),
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
        this.cdRef.markForCheck();
      });

    combineLatest([
      this.converterForm.get('fromCurrency')?.valueChanges.pipe(startWith(null)),
      this.converterForm.get('toCurrency')?.valueChanges.pipe(startWith(null)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        tap(() => ((this.isLoading = true), this.cdRef.markForCheck())),
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
        this.cdRef.markForCheck();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
