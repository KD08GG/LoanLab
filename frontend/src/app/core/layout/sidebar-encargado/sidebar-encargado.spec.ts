import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarEncargado } from './sidebar-encargado';

describe('SidebarEncargado', () => {
  let component: SidebarEncargado;
  let fixture: ComponentFixture<SidebarEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
