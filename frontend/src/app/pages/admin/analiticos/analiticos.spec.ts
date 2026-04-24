import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Analiticos } from './analiticos';

describe('Analiticos', () => {
  let component: Analiticos;
  let fixture: ComponentFixture<Analiticos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analiticos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Analiticos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
