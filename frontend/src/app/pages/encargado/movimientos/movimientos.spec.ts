import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovimientosEncargado } from './movimientos';

describe('MovimientosEncargado', () => {
  let component: MovimientosEncargado;
  let fixture: ComponentFixture<MovimientosEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientosEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovimientosEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
