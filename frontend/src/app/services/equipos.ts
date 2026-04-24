import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Equipo {
  id_equipo: number;
  nombre_equipo: string;
  marca: string;
  modelo: string;
  num_serie: string;
  fecha_alta: string;
  fecha_baja: string | null;
  activo_equipo: boolean;
  id_categoria: number;
  id_ubicacion: number;
  id_estado_equipo: number;
}

export interface EstadoEquipo {
  id_estado_equipo: number;
  nombre_estado: string;
}

@Injectable({ providedIn: 'root' })
export class EquiposService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getEquipos(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/equipos/`);
  }

  getEstados(): Observable<EstadoEquipo[]> {
    return this.http.get<EstadoEquipo[]>(`${this.apiUrl}/estados-equipo/`);
  }

  agregarEquipo(equipo: Partial<Equipo>): Observable<Equipo> {
    return this.http.post<Equipo>(`${this.apiUrl}/equipos/`, equipo);
  }

  actualizarEquipo(id: number, data: Partial<Equipo>): Observable<Equipo> {
    return this.http.patch<Equipo>(`${this.apiUrl}/equipos/${id}/`, data);
  }

  eliminarEquipo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/equipos/${id}/`);
  }
}
