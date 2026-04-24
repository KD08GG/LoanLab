import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarUsuario } from './sidebar-usuario';

describe('SidebarUsuario', () => {
  let component: SidebarUsuario;
  let fixture: ComponentFixture<SidebarUsuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarUsuario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarUsuario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
