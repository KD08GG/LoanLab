import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeEncargado } from './home';

describe('HomeEncargado', () => {
  let component: HomeEncargado;
  let fixture: ComponentFixture<HomeEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
