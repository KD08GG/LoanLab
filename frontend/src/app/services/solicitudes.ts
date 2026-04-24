import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Solicitud {
  id_solicitud: number;
  id_usuario_solicita: number;
  id_equipo: number;
  fecha_solicitud: string;
  grupo_solicitud: string;
  estado_solicitud: string;
  tipo_solicitud?: string;
  motivo?: string;
  fecha_inicio_prestamo?: string;
  fecha_fin_prestamo?: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.apiUrl}/solicitud/`);
  }

  aprobar(id: number, id_usuario_entrega: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/solicitud/${id}/aprobar/`, {
      id_usuario_entrega
    });
  }

  rechazar(id: number): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.apiUrl}/solicitud/${id}/`, {
      estado_solicitud: 'Rechazada'
    });
  }

  crearSolicitud(solicitud: Partial<Solicitud>): Observable<Solicitud> {
    return this.http.post<Solicitud>(`${this.apiUrl}/solicitud/`, solicitud);
  }

  eliminarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/solicitud/${id}/`);
  }
}
