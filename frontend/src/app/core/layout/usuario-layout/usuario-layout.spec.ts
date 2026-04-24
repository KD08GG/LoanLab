import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuarioLayout } from './usuario-layout';

describe('UsuarioLayout', () => {
  let component: UsuarioLayout;
  let fixture: ComponentFixture<UsuarioLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsuarioLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
