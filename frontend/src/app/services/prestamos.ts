import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Prestamo {
  id_prestamo: number;
  id_equipo: number;
  id_usuario: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado_prestamo: string;
  id_estado_equipo: number;
  id_usuario_entrega: number;
  id_solicitud: number;
  estado_solicitud: string;
}

@Injectable({ providedIn: 'root' })
export class PrestamosService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getPrestamos(): Observable<Prestamo[]> {
    return this.http.get<Prestamo[]>(`${this.apiUrl}/prestamos/`);
  }

  devolver(idPrestamo: number, idUsuarioEntrega?: number): Observable<any> {
    const body = idUsuarioEntrega ? { id_usuario_entrega: idUsuarioEntrega } : {};
    return this.http.post(`${this.apiUrl}/prestamos/${idPrestamo}/devolver/`, body);
  }
}
