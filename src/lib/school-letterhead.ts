//* The school header printed on payslips and student bills. Always read from
//* SystemSettings at render time — never stored on the document itself.
export type SchoolLetterhead = {
  name: string;
  //* Always an image URL: the logo saved in Settings, or the default it shows.
  logo: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  //* The stamp uploaded in Settings, or null when the school has none.
  stamp: string | null;
};
