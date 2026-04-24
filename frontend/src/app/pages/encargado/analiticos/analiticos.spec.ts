import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnaliticosEncargado } from './analiticos';

describe('AnaliticosEncargado', () => {
  let component: AnaliticosEncargado;
  let fixture: ComponentFixture<AnaliticosEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnaliticosEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnaliticosEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
