import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioEncargado } from './inventario';

describe('InventarioEncargado', () => {
  let component: InventarioEncargado;
  let fixture: ComponentFixture<InventarioEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
