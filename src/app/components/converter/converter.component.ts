import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
              type="number"
              formControlName="fromAmount"
              min="0"
            />
            <span matTextSuffix>{{
              converterForm.get('fromCurrency')?.value
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
            <input matInput type="number" formControlName="toAmount" min="0" />
            <span matTextSuffix>{{
              converterForm.get('toCurrency')?.value
            }}</span>
          </mat-form-field>
        </div>
      </form>

      <div class="loading-spinner" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    </div>
  `,
  styles: [
    `
      .converter-container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 0 1rem;
      }

      .converter-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-top: 2rem;
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
  private fromValueChange$ = new Subject<void>();
  private toValueChange$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private converterService: ConverterService
  ) {
    this.converterForm = new FormGroup({
      fromCurrency: new FormControl('USD', {nonNullable: true}),
      toCurrency: new FormControl('USD'),
      fromAmount: new FormControl(0),
      toAmount: new FormControl(0),
    });
  }

  ngOnInit() {
    this.converterForm
      .get('fromAmount')?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((value) => {
          if (!value || value === 0) {
            this.converterForm.patchValue(
              { toAmount: 0 },
              { emitEvent: false }
            );
            return of(null);
          }
          this.isLoading = true;
          return this.converterService.convertFromTo(
            this.converterForm.get('fromCurrency')?.value,
            this.converterForm.get('toCurrency')?.value,
            value
          );
        })
      )
      .subscribe((result) => {
        this.isLoading = false;
        if (result) {
          this.converterForm.patchValue(
            { toAmount: result },
            { emitEvent: false }
          );
        }
      });

    this.converterForm
      .get('toAmount')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((value) => {
          if (!value || value === 0) {
            this.converterForm.patchValue(
              { fromAmount: 0 },
              { emitEvent: false }
            );
            return of(null);
          }
          this.isLoading = true;
          return this.converterService.convertFromTo(
            this.converterForm.get('toCurrency')?.value,
            this.converterForm.get('fromCurrency')?.value,
            value
          );
        })
      )
      .subscribe((result) => {
        this.isLoading = false;
        if (result) {
          this.converterForm.patchValue(
            { fromAmount: result },
            { emitEvent: false }
          );
        }
      });

    combineLatest([
      this.converterForm
        .get('fromCurrency')
        ?.valueChanges.pipe(startWith(null)),
      this.converterForm.get('toCurrency')?.valueChanges.pipe(startWith(null)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          const fromAmount = this.converterForm.get('fromAmount')?.value;
          if (fromAmount <= 0) {
            return of();
          }
          return this.converterService.convertFromTo(
            this.converterForm.get('fromCurrency')?.value,
            this.converterForm.get('toCurrency')?.value,
            fromAmount
          );
        })
      )
      .subscribe((result) => {
        this.isLoading = false;
        if (result) {
          this.converterForm.patchValue(
            { toAmount: result },
            { emitEvent: false }
          );
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
