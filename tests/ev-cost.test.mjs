import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCosts,vehicleClasses,fuels} from '../ev-cost-model.mjs';
const base={kmDay:50,daysMonth:26,years:5,iceEconomy:10,fuelPrice:10000,evConsumption:15,chargingLoss:0,homeShare:100,homeRate:1500,homeTax:0,publicRate:2500,sessionFee:0,sessionKwh:30,includeService:false,includeTax:false};
test('annual distance and fuel/electric costs use the same annual travel',()=>{
 const r=calculateCosts(base);assert.equal(r.kmYear,15600);assert.equal(r.iceEnergy,15600000);assert.equal(r.evEnergy,3510000);assert.equal(r.difference,12090000);assert.equal(r.gridKwhYear,2340);
});
test('charging losses divide delivered energy and public sessions only charge public use',()=>{
 const r=calculateCosts({...base,chargingLoss:10,homeShare:50,homeTax:10,sessionFee:10000});
 assert.equal(r.gridKwhYear,2600);assert.equal(r.publicSessions,44);assert.ok(Math.abs(r.homeEnergy-2145000)<0.01);assert.equal(r.publicEnergy,3690000);
 const home=calculateCosts({...base,sessionFee:57000});assert.equal(home.publicSessions,0);assert.equal(home.publicEnergy,0);
 const publicOnly=calculateCosts({...base,homeShare:0});assert.equal(publicOnly.homeEnergy,0);assert.equal(publicOnly.evEnergy,5850000);
});
test('zero use avoids division by zero and still includes selected fixed costs',()=>{
 const r=calculateCosts({...base,kmDay:0,includeTax:true,iceTax:3000000,evTax:150000});assert.equal(r.iceEnergy,0);assert.equal(r.evEnergy,0);assert.equal(r.icePerKm,null);assert.equal(r.publicSessions,0);assert.equal(r.iceTotal,3000000);
 const empty=calculateCosts({...base,kmDay:0});assert.equal(empty.percent,null);
});
test('service and tax require explicit amounts on both sides; omitted costs never silently enter totals',()=>{
 assert.throws(()=>calculateCosts({...base,includeTax:true,iceTax:0,evTax:''}));
 assert.throws(()=>calculateCosts({...base,includeService:true,iceService:2000000,evService:undefined}));
 const r=calculateCosts({...base,includeService:true,iceService:2000000,evService:0,includeTax:true,iceTax:3000000,evTax:150000});assert.equal(r.iceTotal,20600000);assert.equal(r.evTotal,3660000);
 assert.equal(calculateCosts({...base,iceService:9999999}).iceTotal,15600000);
});
test('the EV can cost more and invalid/empty inputs are rejected',()=>{
 const r=calculateCosts({...base,publicRate:10000,homeShare:0});assert.ok(r.difference<0);assert.ok(r.percent<0);
 for(const patch of [{iceEconomy:0},{chargingLoss:100},{homeShare:101},{kmDay:-1},{kmDay:''},{fuelPrice:Infinity},{daysMonth:26.5}])assert.throws(()=>calculateCosts({...base,...patch}));
});
test('diesel class and fuel presets stay distinct from petrol',()=>{assert.equal(vehicleClasses.diesel.fuel,'diesel');assert.equal(fuels.petrol.type,'petrol');assert.equal(fuels.diesel.type,'diesel');});

test('Plug-in hybrid splits the same annual distance and adds petrol separately from grid electricity',()=>{
 const r=calculateCosts({...base,powertrain:'phev',electricShare:50,dmEconomy:20,dmFuelPrice:15000});
 assert.equal(r.electricKmYear,7800);assert.equal(r.dmKmYear,7800);assert.equal(r.dmLitresYear,390);assert.equal(r.dmFuelEnergy,5850000);assert.equal(r.electricEnergy,1755000);assert.equal(r.evEnergy,7605000);
 const petrol=calculateCosts({...base,powertrain:'phev',electricShare:0,dmEconomy:20,dmFuelPrice:15000});assert.equal(petrol.gridKwhYear,0);assert.equal(petrol.publicSessions,0);assert.equal(petrol.evEnergy,11700000);
 const electric=calculateCosts({...base,powertrain:'phev',electricShare:100,dmEconomy:20,dmFuelPrice:15000});assert.equal(electric.dmFuelEnergy,0);assert.equal(electric.evEnergy,3510000);
});
test('Plug-in hybrid never invents a petrol consumption when it is missing',()=>{
 for(const patch of [{dmEconomy:''},{electricShare:101},{dmFuelPrice:-1}])assert.throws(()=>calculateCosts({...base,powertrain:'phev',electricShare:50,dmEconomy:20,dmFuelPrice:15000,...patch}));
});
