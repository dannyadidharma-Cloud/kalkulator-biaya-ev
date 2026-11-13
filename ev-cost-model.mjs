export const vehicleClasses={
 city:{label:'City car / LCGC · 1.000–1.200 cc',fuel:'petrol',economy:15,service:2000000},
 compact:{label:'Hatchback / MPV / SUV kompak · 1.300–1.500 cc',fuel:'petrol',economy:12,service:3000000},
 medium:{label:'Mobil bensin menengah · 1.600–2.000 cc',fuel:'petrol',economy:10,service:4000000},
 large:{label:'SUV bensin · 2.100–2.700 cc',fuel:'petrol',economy:8,service:7000000},
 premium:{label:'Sedan / SUV premium bensin · 2.000–3.500 cc',fuel:'petrol',economy:8,service:12000000},
 diesel:{label:'SUV diesel · 2.400–2.800 cc',fuel:'diesel',economy:10,service:8000000}
};
// Scenario starting points, not measured averages or manufacturer specifications.
export const fuels={
 petrol:{label:'Bensin',type:'petrol',price:13000},
 diesel:{label:'Diesel',type:'diesel',price:14500}
};
const ranges={kmDay:[0,1000],daysMonth:[1,31],years:[1,10],iceEconomy:[1,60],fuelPrice:[1,100000],evConsumption:[1,80],chargingLoss:[0,50],homeShare:[0,100],homeRate:[0,100000],homeTax:[0,30],publicRate:[0,100000],sessionFee:[0,500000],sessionKwh:[1,500]};

export function estimateElectricShare(kmDay, rangePerCharge, tripsBetweenCharges){
 const distance=Number(kmDay),range=Number(rangePerCharge),trips=Number(tripsBetweenCharges);
 if(!Number.isFinite(distance)||distance<=0||!Number.isFinite(range)||range<=0||!Number.isFinite(trips)||trips<=0)return 0;
 return Math.round(Math.min(100,range/(distance*trips)*100)*10)/10;
}

function servicePackage(input, side, kmYear){
 const limits=[['FreeYears',1,10],['FreeKm',1,1000000]].map(([suffix,min,max])=>{
  const raw=input[side+suffix];
  if(raw==null||raw==='')return Infinity;
  const value=Number(raw);
  if(!Number.isInteger(value)||value<min||value>max)throw new Error('Periksa batas gratis servis. Kosongkan batas yang tidak berlaku.');
  return suffix==='FreeKm'?(kmYear?value/kmYear:Infinity):value;
 });
 // No package unless at least one limit was entered. The first limit ends coverage.
 const freeDuration=limits.every(value=>value===Infinity)&&!input[side+'FreeKm']?0:Math.min(...limits);
 const coveredCost=Number(input[side+'CoveredService']||0);
 if(!Number.isFinite(coveredCost)||coveredCost<0||coveredCost>1000000000)throw new Error('Periksa biaya servis selama paket.');
 return {freeDuration,coveredCost};
}

function serviceSchedule(input, side, annualBudget, kmYear, count){
 const {freeDuration,coveredCost}=servicePackage(input,side,kmYear);
 return Array.from({length:count},(_,year)=>{
  const paidFraction=Math.min(1,Math.max(0,year+1-freeDuration));
  return annualBudget*paidFraction+coveredCost*(1-paidFraction);
 });
}

function evServiceSchedule(input, costPerVisit, kmYear, count){
 const {freeDuration,coveredCost}=servicePackage(input,'ev',kmYear);
 // Visits recur after 12 months or 20,000 km at a constant driving rate.
 const frequency=Math.max(1,kmYear/20000);
 const visitsDue=years=>Math.floor(years*frequency+1e-9);
 const coveredThrough=visitsDue(freeDuration);
 return Array.from({length:count},(_,year)=>{
  const start=visitsDue(year),end=visitsDue(year+1);
  const visits=end-start;
  const covered=Math.min(end,coveredThrough)-Math.min(start,coveredThrough);
  return {visits,covered,cost:(visits-covered)*costPerVisit+covered*coveredCost};
 });
}
export function calculatePowertrainEnergy({
 kmYear,electricShare=100,dmEconomy=1,dmFuelPrice=0,evConsumption,chargingLoss,
 homeShare,homeRate,homeTax=0,publicRate,sessionFee=0,sessionKwh=30,
}){
 const electricKmYear=kmYear*electricShare/100,dmKmYear=kmYear-electricKmYear;
 const dmLitresYear=dmKmYear/dmEconomy,dmFuelEnergy=dmLitresYear*dmFuelPrice;
 const batteryKwhYear=electricKmYear*evConsumption/100;
 const gridKwhYear=batteryKwhYear/(1-chargingLoss/100);
 const homeKwh=gridKwhYear*homeShare/100,publicKwh=gridKwhYear-homeKwh;
 const publicSessions=publicKwh>0?Math.ceil(publicKwh/sessionKwh):0;
 const homeEnergy=homeKwh*homeRate*(1+homeTax/100);
 const publicEnergy=publicKwh*publicRate+publicSessions*sessionFee;
 const electricEnergy=homeEnergy+publicEnergy;
 return {electricKmYear,dmKmYear,dmLitresYear,dmFuelEnergy,batteryKwhYear,gridKwhYear,publicSessions,homeEnergy,publicEnergy,electricEnergy,evEnergy:electricEnergy+dmFuelEnergy};
}

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
 const powertrainEnergy=calculatePowertrainEnergy({...x,kmYear,electricShare,dmEconomy,dmFuelPrice});
 const {evEnergy}=powertrainEnergy;
 const iceEnergy=litresYear*x.fuelPrice;
 const count=Math.max(5,x.years);
 const iceServiceYears=input.includeService?serviceSchedule(input,'ice',x.iceService,kmYear,count):Array(count).fill(0);
 const evVisits=input.includeService&&input.powertrain==='ev'?evServiceSchedule(input,x.evService,kmYear,count):null;
 const evServiceYears=evVisits?evVisits.map(entry=>entry.cost)
  :input.includeService?serviceSchedule(input,'ev',x.evService,kmYear,count):Array(count).fill(0);
 const serviceYears=iceServiceYears.map((iceService,index)=>({
  year:index+1,iceService,evService:evServiceYears[index],
  ...(evVisits?{evVisits:evVisits[index].visits,evCoveredVisits:evVisits[index].covered}:{}),
 }));
 const totals=years=>{
  const sum=values=>values.slice(0,years).reduce((total,value)=>total+value,0);
  const energy={ice:iceEnergy*years,ev:evEnergy*years};
  const service={ice:sum(iceServiceYears),ev:sum(evServiceYears)};
  const tax={ice:x.iceTax*years,ev:x.evTax*years};
  const ice=energy.ice+service.ice+tax.ice,ev=energy.ev+service.ev+tax.ev;
  return {years,energy,service,tax,ice,ev,difference:ice-ev,
   ...(evVisits?{evVisits:sum(evVisits.map(entry=>entry.visits)),evCoveredVisits:sum(evVisits.map(entry=>entry.covered))}:{}),
  };
 };
 const periods=[1,3,5].map(totals);
 const [annual,,fiveYears]=periods;
 const {ice:iceTotal,ev:evTotal,difference}=annual;
 const projection=periods.find(period=>period.years===x.years)??totals(x.years);
 return {...powertrainEnergy,kmMonth,kmYear,litresYear,iceEnergy,iceService:iceServiceYears[0],evService:evServiceYears[0],iceTax:x.iceTax,evTax:x.evTax,iceTotal,evTotal,difference,percent:iceTotal>0?difference/iceTotal*100:null,icePerKm:kmYear?iceTotal/kmYear:null,evPerKm:kmYear?evTotal/kmYear:null,years:x.years,serviceYears,periods,fiveYears,projection};
}
