import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuariosEncargado } from './usuarios';

describe('UsuariosEncargado', () => {
  let component: UsuariosEncargado;
  let fixture: ComponentFixture<UsuariosEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsuariosEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
