import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Header } from './header/header';
import { Footer } from './footer/footer';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterModule, Header, Footer],
  templateUrl: './public-layout.html',
  styleUrls: ['./public-layout.scss']
})
export class PublicLayout {

}
