import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitudesEncargado } from './solicitudes';

describe('SolicitudesEncargado', () => {
  let component: SolicitudesEncargado;
  let fixture: ComponentFixture<SolicitudesEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitudesEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
