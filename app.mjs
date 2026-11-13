import {calculateCosts} from './ev-cost-model.mjs';

const form = document.querySelector('#assumptions');
const fixedFields = document.querySelector('#fixed-fields');
const cards = document.querySelector('#results');
const template = document.querySelector('#result-card');
const distance = document.querySelector('#distance');
const error = document.querySelector('#error');
const publicShare = document.querySelector('#public-share');
const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
});
const number = new Intl.NumberFormat('id-ID', {maximumFractionDigits: 1});

function addBreakdown(list, label, value) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const amount = document.createElement('dd');
  term.textContent = label;
  amount.textContent = idr.format(value);
  row.append(term, amount);
  list.append(row);
}

function showVehicle({name, example, total, perKm, items}, years) {
  const card = template.content.cloneNode(true);
  card.querySelector('h3').textContent = name;
  card.querySelector('.example').textContent = example;
  card.querySelector('[data-label="period"]').textContent = 'Total ' + years + ' tahun';
  card.querySelector('[data-value="total"]').textContent = idr.format(total);
  card.querySelector('[data-row="annual"]').hidden = years === 1;
  card.querySelector('[data-value="annual"]').textContent = idr.format(total / years);
  card.querySelector('[data-value="perKm"]').textContent =
    perKm === null ? '—' : idr.format(perKm);
  for (const [label, value] of items) addBreakdown(card.querySelector('.breakdown'), label, value);
  return card;
}

function compare(input, includeFixed) {
  const years = Number(input.years);
  const common = {
    ...input, homeTax: 0, includeService: includeFixed, includeTax: includeFixed,
    iceEconomy: input.petrolEconomy, fuelPrice: input.petrolPrice,
    iceService: input.petrolService, iceTax: input.petrolTax
  };
  const ev = calculateCosts(common);
  const phev = calculateCosts({
    ...common, powertrain: 'phev', evConsumption: input.phevConsumption,
    dmEconomy: input.phevEconomy, dmFuelPrice: input.petrolPrice,
    evService: input.phevService, evTax: input.phevTax
  });
  const diesel = calculateCosts({
    ...common, iceEconomy: input.dieselEconomy, fuelPrice: input.dieselPrice,
    iceService: input.dieselService, iceTax: input.dieselTax
  });
  const charging = result => [
    ['Listrik di rumah', result.homeEnergy * years],
    ['Listrik SPKLU (' + number.format(result.publicSessions * years) + ' sesi)', result.publicEnergy * years]
  ];
  const fixed = (result, side) => includeFixed
    ? [['Servis', result.projection.service[side]], ['Pajak', result.projection.tax[side]]] : [];
  const vehicles = [
    {name: 'Mobil listrik', example: 'Contoh A', total: ev.projection.ev, perKm: ev.evPerKm,
      items: [...charging(ev), ...fixed(ev, 'ev')]},
    {name: 'Plug-in hybrid', example: 'Contoh B', total: phev.projection.ev, perKm: phev.evPerKm,
      items: [...charging(phev), ['Bensin', phev.dmFuelEnergy * years], ...fixed(phev, 'ev')]},
    {name: 'Mobil bensin', example: 'Contoh C', total: ev.projection.ice, perKm: ev.icePerKm,
      items: [['Bensin', ev.projection.energy.ice], ...fixed(ev, 'ice')]},
    {name: 'Mobil diesel', example: 'Contoh D', total: diesel.projection.ice, perKm: diesel.icePerKm,
      items: [['Diesel', diesel.projection.energy.ice], ...fixed(diesel, 'ice')]}
  ];
  return {kmYear: ev.kmYear, years, vehicles};
}

function render() {
  const includeFixed = form.elements.includeFixed.checked;
  fixedFields.hidden = fixedFields.disabled = !includeFixed;
  const home = form.elements.homeShare;
  publicShare.value = home.validity.valid ? number.format(100 - home.valueAsNumber) + '%' : '—';

  const invalid = form.querySelector('input:invalid');
  error.hidden = !invalid;
  cards.hidden = distance.hidden = Boolean(invalid);
  if (invalid) {
    const label = invalid.labels[0].textContent.trim();
    error.textContent = 'Periksa isian “' + label + '”. ' +
      (invalid.validity.valueMissing ? 'Masukkan angka.' : 'Gunakan angka antara ' + invalid.min + ' dan ' + invalid.max + ' sesuai satuannya.');
    return;
  }

  const input = Object.fromEntries(new FormData(form));
  const {kmYear, years, vehicles} = compare(input, includeFixed);
  distance.textContent = number.format(kmYear * years) + ' km dalam ' + years + ' tahun · ' +
    (includeFixed ? 'Energi, servis, dan pajak.' : 'Biaya energi saja.') +
    (kmYear === 0 ? ' Biaya per kilometer tersedia jika jarak lebih dari nol.' : '');
  cards.replaceChildren(...vehicles.map(vehicle => showVehicle(vehicle, years)));
}

form.addEventListener('input', render);
form.addEventListener('reset', () => setTimeout(render, 0));
form.addEventListener('submit', event => event.preventDefault());
render();
