import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment.development';
import fromExponential from 'from-exponential';

@Injectable({
  providedIn: 'root',
})
export class ConverterService {
  private readonly API_BASE_URL = `${environment.apiUrl}/${environment.apiKey}`;

  constructor(private http: HttpClient) {}

  convertFromTo(fromCurrency: string, toCurrency: string, amount: string): Observable<string> {
    return this.conversionApi(fromCurrency, toCurrency, amount);
  }

  private conversionApi(
    fromCurrency: string,
    toCurrency: string,
    amount: string
  ): Observable<string> {
    return this.http
      .get<
        Record<string, number>
      >(`${this.API_BASE_URL}/pair/${fromCurrency}/${toCurrency}/${amount}`)
      .pipe(
        map(response => fromExponential(response['conversion_result'])),
        catchError(() => of('0'))
      );
  }
}
