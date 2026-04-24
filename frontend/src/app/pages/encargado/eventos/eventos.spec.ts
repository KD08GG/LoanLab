import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventosEncargado } from './eventos';

describe('EventosEncargado', () => {
  let component: EventosEncargado;
  let fixture: ComponentFixture<EventosEncargado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventosEncargado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventosEncargado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
