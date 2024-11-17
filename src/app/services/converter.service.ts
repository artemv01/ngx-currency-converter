import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class ConverterService {
  private readonly API_BASE_URL = `${environment.apiUrl}/${environment.apiKey}`;

  constructor(private http: HttpClient) {}

  convertFromTo(fromCurrency: string, toCurrency: string, amount: number): Observable<number> {
    return this.conversionApi(fromCurrency, toCurrency, amount);
  }

  private conversionApi(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Observable<number> {
    return this.http
      .get<
        Record<string, number>
      >(`${this.API_BASE_URL}/pair/${fromCurrency}/${toCurrency}/${amount}`)
      .pipe(
        map(response => response['conversion_result']),
        catchError(() => of(0))
      );
  }
}
