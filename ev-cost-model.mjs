export const vehicleClasses={
 city:{label:'City car / LCGC · 1.000–1.200 cc',fuel:'petrol',economy:15,service:2000000},
 compact:{label:'Hatchback / MPV / SUV kompak · 1.300–1.500 cc',fuel:'petrol',economy:12,service:3000000},
 medium:{label:'MPV / SUV menengah · 1.800–2.000 cc',fuel:'petrol',economy:10,service:4000000},
 large:{label:'SUV besar bensin · 2.400–2.700 cc',fuel:'petrol',economy:8,service:7000000},
 premium:{label:'Sedan / SUV premium bensin · 2.000–3.500 cc',fuel:'petrol',economy:8,service:12000000},
 diesel:{label:'SUV diesel · 2.400–2.800 cc',fuel:'diesel',economy:10,service:8000000}
};
// Scenario starting points, not measured averages or manufacturer specifications.
export const fuels={
 petrol:{label:'Bensin',type:'petrol',price:13000},
 diesel:{label:'Diesel',type:'diesel',price:14500}
};
const ranges={kmDay:[0,1000],daysMonth:[1,31],years:[1,10],iceEconomy:[1,60],fuelPrice:[1,100000],evConsumption:[1,80],chargingLoss:[0,50],homeShare:[0,100],homeRate:[0,100000],homeTax:[0,30],publicRate:[0,100000],sessionFee:[0,500000],sessionKwh:[1,500]};
export function calculateCosts(input){
 const x={};
 for(const [key,[min,max]] of Object.entries(ranges)){
  const raw=input[key],value=Number(raw);
  if(raw===''||raw===null||raw===undefined||!Number.isFinite(value)||value<min||value>max)throw new Error('Periksa angka '+key+'.');
  x[key]=value;
 }
 if(!Number.isInteger(x.daysMonth)||!Number.isInteger(x.years))throw new Error('Hari pemakaian dan tahun harus bilangan bulat.');
 for(const group of ['service','tax'])for(const side of ['ice','ev']){
  const key=side+group[0].toUpperCase()+group.slice(1),raw=input[key],value=Number(raw);
  if(input['include'+group[0].toUpperCase()+group.slice(1)]&&(raw===''||raw===undefined||raw===null||!Number.isFinite(value)||value<0||value>1000000000))throw new Error('Isi biaya '+group+' kedua kendaraan, termasuk 0 jika memang nihil.');
  x[key]=input['include'+group[0].toUpperCase()+group.slice(1)]?value:0;
 }
 const kmMonth=x.kmDay*x.daysMonth,kmYear=kmMonth*12;
 const litresYear=kmYear/x.iceEconomy;
 const phev=input.powertrain==='phev';
 let electricShare=100,dmEconomy=1,dmFuelPrice=0;
 if(phev){
  for(const [key,min,max] of [['electricShare',0,100],['dmEconomy',1,60],['dmFuelPrice',1,100000]]){
   const raw=input[key],v=Number(raw);
   if(raw===''||raw==null||!Number.isFinite(v)||v<min||v>max)throw new Error('Lengkapi asumsi plug-in hybrid: '+key+'.');
   if(key==='electricShare')electricShare=v;else if(key==='dmEconomy')dmEconomy=v;else dmFuelPrice=v;
  }
 }
 const electricKmYear=kmYear*electricShare/100,dmKmYear=kmYear-electricKmYear;
 const dmLitresYear=dmKmYear/dmEconomy,dmFuelEnergy=dmLitresYear*dmFuelPrice;
 const batteryKwhYear=electricKmYear*x.evConsumption/100;
 const gridKwhYear=batteryKwhYear/(1-x.chargingLoss/100);
 const homeKwh=gridKwhYear*x.homeShare/100,publicKwh=gridKwhYear-homeKwh;
 const publicSessions=publicKwh>0?Math.ceil(publicKwh/x.sessionKwh):0;
 const homeEnergy=homeKwh*x.homeRate*(1+x.homeTax/100);
 const publicEnergy=publicKwh*x.publicRate+publicSessions*x.sessionFee;
 const iceEnergy=litresYear*x.fuelPrice,electricEnergy=homeEnergy+publicEnergy,evEnergy=electricEnergy+dmFuelEnergy;
 const iceTotal=iceEnergy+x.iceService+x.iceTax,evTotal=evEnergy+x.evService+x.evTax;
 const difference=iceTotal-evTotal;
 return {electricKmYear,dmKmYear,dmLitresYear,dmFuelEnergy,electricEnergy,kmMonth,kmYear,litresYear,batteryKwhYear,gridKwhYear,publicSessions,homeEnergy,publicEnergy,iceEnergy,evEnergy,iceService:x.iceService,evService:x.evService,iceTax:x.iceTax,evTax:x.evTax,iceTotal,evTotal,difference,percent:iceTotal>0?difference/iceTotal*100:null,icePerKm:kmYear?iceTotal/kmYear:null,evPerKm:kmYear?evTotal/kmYear:null,years:x.years};
}
