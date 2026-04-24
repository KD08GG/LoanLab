import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AyudaEncargado } from './ayuda';

describe('AyudaEncargado', () => {
  let component: AyudaEncargado;
  let fixture: ComponentFixture<AyudaEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AyudaEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AyudaEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
