import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConverterService } from '../../services/converter.service';
import {
  Observable,
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
  template: `
    <div class="converter-container">
      <h1 class="mat-headline-4">Currency converter</h1>
      <h2 class="mat-subtitle-1">Available currencies: RUB, USD, EUR, GBP</h2>

      <form [formGroup]="converterForm" class="converter-form">
        <div class="currency-block">
          <mat-form-field appearance="outline">
            <mat-label>From Currency</mat-label>
            <mat-select formControlName="fromCurrency">
              <mat-option value="RUB">RUB</mat-option>
              <mat-option value="USD">USD</mat-option>
              <mat-option value="EUR">EUR</mat-option>
              <mat-option value="GBP">GBP</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Amount</mat-label>
            <input
              matInput
              type="text"
              [value]="
                converterForm.get('fromAmount')?.value
                  | currency : '' : '' : '1.0-2' : 'en-US'
              "
              (input)="onAmountInput($event, 'fromAmount')"
              min="0"
            />
            <span matTextSuffix class="currency-symbol">{{
              getCurrencySymbol(converterForm.get('fromCurrency')?.value)
            }}</span>
          </mat-form-field>
        </div>
        <div class="currency-block">
          <mat-form-field appearance="outline">
            <mat-label>To Currency</mat-label>
            <mat-select formControlName="toCurrency">
              <mat-option value="RUB">RUB</mat-option>
              <mat-option value="USD">USD</mat-option>
              <mat-option value="EUR">EUR</mat-option>
              <mat-option value="GBP">GBP</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Amount</mat-label>
            <input
              matInput
              type="text"
              [value]="
                converterForm.get('toAmount')?.value
                  | currency : '' : '' : '1.0-2' : 'en-US'
              "
              (input)="onAmountInput($event, 'toAmount')"
              min="0"
            />
            <span matTextSuffix class="currency-symbol">{{
              getCurrencySymbol(converterForm.get('toCurrency')?.value)
            }}</span>
          </mat-form-field>
        </div>
      </form>

      <div class="loading-spinner" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <button
        mat-fab
        color="primary"
        class="switch-button"
        (click)="switchCurrencies()"
      >
        <mat-icon>swap_vert</mat-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .converter-container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 0 1rem;
        position: relative;
        min-height: 400px;
      }

      .converter-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-top: 2rem;
        position: relative;
      }

      .currency-block {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      mat-form-field {
        flex: 1;
        min-width: 200px;
      }

      .loading-spinner {
        display: flex;
        justify-content: center;
        margin-top: 1rem;
      }

      .currency-symbol {
        color: rgba(0, 0, 0, 0.54);
      }

      .switch-button {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 1000;
      }

      @media (max-width: 480px) {
        .currency-block {
          flex-direction: column;
          gap: 0.5rem;
        }

        mat-form-field {
          width: 100%;
        }
      }
    `,
  ],
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
    return this.converterService.convertFromTo(
      this.converterForm.get('fromCurrency')?.value,
      this.converterForm.get('toCurrency')?.value,
      amount
    );
  }

  ngOnInit() {
    this.converterForm
      .get('fromAmount')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => (this.isLoading = true, this.cdRef.markForCheck())),
        switchMap((amount) =>
          this.convertFromTo(
            this.converterForm.get('fromCurrency')?.value,
            this.converterForm.get('toCurrency')?.value,
            amount
          )
        ),
        tap(() => (this.isLoading = false))
      )
      .subscribe((result) => {
        if (result) {
          this.converterForm.patchValue(
            { toAmount: result },
            { emitEvent: false }
          );
        }
        this.cdRef.markForCheck();
      });

    this.converterForm
      .get('toAmount')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => (this.isLoading = true, this.cdRef.markForCheck())),
        switchMap((amount) =>
          this.convertFromTo(
            this.converterForm.get('toCurrency')?.value,
            this.converterForm.get('fromCurrency')?.value,
            amount
          )
        ),
        tap(() => (this.isLoading = false))
      )
      .subscribe((result) => {
        if (result) {
          this.converterForm.patchValue(
            { fromAmount: result },
            { emitEvent: false }
          );
        }
        this.cdRef.markForCheck();
      });

    combineLatest([
      this.converterForm
        .get('fromCurrency')
        ?.valueChanges.pipe(startWith(null)),
      this.converterForm.get('toCurrency')?.valueChanges.pipe(startWith(null)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        tap(() => (this.isLoading = true, this.cdRef.markForCheck())),
        switchMap((amount) =>
          this.convertFromTo(
            this.converterForm.get('fromCurrency')?.value,
            this.converterForm.get('toCurrency')?.value,
            this.converterForm.get('fromAmount')?.value
          )
        ),

        tap(() => (this.isLoading = false))
      )
      .subscribe((result) => {
        if (result) {
          this.converterForm.patchValue(
            { toAmount: result },
            { emitEvent: false }
          );
        }
        this.cdRef.markForCheck();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
