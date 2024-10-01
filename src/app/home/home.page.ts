import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VehicleInfo } from 'src/interface/VehicleInfo';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  form: FormGroup;
  isLoading: Boolean = false;

  vehicleInfo: VehicleInfo | undefined;

  constructor(private fb: FormBuilder,private http: HttpClient) {
    this.form = fb.group({
      vehicleNumber: ['', Validators.required],
      latLng: [''] 
    })
  }


  fetchDetails(){
    const data = this.form.value;
    if(data && data.vehicleNumber){
      console.log(data);
      const url = `https://vtmscgm.gujarat.gov.in/OpenVehicleStatus/GetOpenVehicleStatus?vehiclenumber=${data.vehicleNumber}`
      // 
      this.isLoading = true;
      this.http.get<VehicleInfo[]>(url).subscribe((res)=>{
          if(res && res.length){
            this.vehicleInfo = res[0];
          }
      }, (err)=>{
        console.log(err)
      }, ()=>{
        this.isLoading = false;
      });
    }
  }


  updateDetails(){

  }
}
