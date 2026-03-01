import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home {
  cases = [
    { name: 'Midnight', material: 'Carbon Fiber', price: '90', image: 'assets/images/cases/1.jpeg' },
    { name: 'Natural Stone', material: 'Natural Stone', price: '90', image: 'assets/images/cases/2.jpeg' },
    { name: 'Pure Arctic', material: 'Kevlar', price: '90', image: 'assets/images/cases/3.jpeg' },
  ];
}
