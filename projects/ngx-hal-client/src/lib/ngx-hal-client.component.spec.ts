import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxHalClientComponent } from './ngx-hal-client.component';

describe('NgxHalClientComponent', () => {
    let component: NgxHalClientComponent;
    let fixture: ComponentFixture<NgxHalClientComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [NgxHalClientComponent]
        });
        fixture = TestBed.createComponent(NgxHalClientComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
