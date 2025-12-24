export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-primary-900 py-10 sm:py-16 lg:py-20">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white">ჩვენ შესახებ</h1>
          <p className="mt-3 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-primary-100 px-2">
            ჩვენი მისია არის განათლების ხელმისაწვდომობა ყველასთვის
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-10 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">ჩვენი მისია</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-3 sm:mb-4">
                Kursebi Online შეიქმნა იმ იდეით, რომ ხარისხიანი განათლება უნდა იყოს ხელმისაწვდომი ყველასთვის,
                მიუხედავად გეოგრაფიული მდებარეობისა თუ ფინანსური შესაძლებლობებისა.
              </p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-3 sm:mb-4">
                ჩვენ ვთანამშრომლობთ საუკეთესო ინსტრუქტორებთან და ინდუსტრიის ექსპერტებთან,
                რათა შევქმნათ კურსები, რომლებიც მართლაც ემსახურება სტუდენტების საჭიროებებს
                და ეხმარება მათ კარიერული მიზნების მიღწევაში.
              </p>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                ჩვენი პლატფორმა აერთიანებს თანამედროვე ტექნოლოგიებს და ინოვაციურ სასწავლო მეთოდებს,
                რაც სწავლის პროცესს ხდის მაქსიმალურად ეფექტურს და საინტერესოს.
              </p>
            </div>
            <div className="relative h-64 sm:h-80 lg:h-96 bg-gray-50 rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
