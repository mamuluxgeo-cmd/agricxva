# Supplier Flow Control

Koncept / Brand House მომწოდებლების მართვის ვებ-პანელი.

## მონაცემების წყარო

Google Sheet ინახავს ყველა მონაცემს. Apps Script API URL:

```txt
https://script.google.com/macros/s/AKfycbw5s9EZO_6WYQDpr5IIIJy-mBubSEneL79vkDRBYpPqskYrl_iLkuv_hEl_emgH_Ws-/exec
```

## ფაილები

- `index.html` — გვერდის სტრუქტურა
- `style.css` — თანამედროვე liquid/admin დიზაინი
- `app.js` — API კავშირი, ფორმები, Kanban, ბალანსები

## ძირითადი ფუნქციები

- კომპანიის გადართვა: Brand House / Koncept
- მომწოდებლის რეგისტრაცია საწყისი ბალანსით
- საქონლის ეტაპები: შეკვეთა → გამოიგზავნა → მიღებულია → დასრულებულია
- გზაში მყოფი საქონლის დაჯგუფება გზავნილის ჯგუფით
- მომწოდებელთან დარიცხვა CNY-ში
- ბანკის რეგისტრაცია
- ბანკში თანხის ჩარიცხვა საკომისიოთი
- მომწოდებელზე გადარიცხვა ბანკიდან
- მომწოდებლის ბარათი სრული ისტორიით

## GitHub Pages

Repository settings-ში ჩართე GitHub Pages:

Settings → Pages → Deploy from branch → main → root

შემდეგ საიტი გაიხსნება GitHub Pages მისამართზე.
