import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cases.html',
  styleUrls: ['./cases.scss']
})
export class Cases {
  cases = [
    { name: 'Midnight', material: 'Carbon Fiber', price: '89', image: 'assets/images/cases/1.jpeg' },
    { name: 'Natural Stone', material: 'Natural Stone', price: '89', image: 'assets/images/cases/2.jpeg' },
    { name: 'Pure Arctic', material: 'Kevlar', price: '89', image: 'assets/images/cases/3.jpeg' },
  ];
}
