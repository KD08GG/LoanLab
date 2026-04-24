import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://127.0.0.1:8000/api/usuarios';
  constructor(private http: HttpClient) {}

  login(data: { id_usuario: number; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, data);
  }
}
