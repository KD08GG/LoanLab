import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AjustesEncargado } from './ajustes';

describe('AjustesEncargado', () => {
  let component: AjustesEncargado;
  let fixture: ComponentFixture<AjustesEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjustesEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjustesEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
