export type Contact = {
    id: string;
    name: string;
    email: string;
    phone: string;
    birth_date: string;
    gender: "masculino" | "feminino";
    situation: "cliente" | "lead" | "ex-cliente";
};

