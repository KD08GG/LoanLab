import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EncargadoLayout } from './encargado-layout';

describe('EncargadoLayout', () => {
  let component: EncargadoLayout;
  let fixture: ComponentFixture<EncargadoLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EncargadoLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EncargadoLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
