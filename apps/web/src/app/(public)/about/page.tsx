import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  const stats = [
    { value: '1,000+', label: 'სტუდენტი' },
    { value: '50+', label: 'კურსი' },
    { value: '20+', label: 'ინსტრუქტორი' },
    { value: '95%', label: 'კმაყოფილება' },
  ];

  const team = [
    {
      name: 'გიორგი მაისურაძე',
      role: 'დამფუძნებელი & CEO',
      image: null,
      bio: '10+ წლიანი გამოცდილება ტექნოლოგიების სფეროში',
    },
    {
      name: 'ნინო კვარაცხელია',
      role: 'სასწავლო დირექტორი',
      image: null,
      bio: 'განათლების ექსპერტი, PhD პედაგოგიკაში',
    },
    {
      name: 'დავით ბერიძე',
      role: 'ტექნიკური დირექტორი',
      image: null,
      bio: 'Full-stack დეველოპერი 8+ წლიანი გამოცდილებით',
    },
    {
      name: 'მარიამ გელაშვილი',
      role: 'მარკეტინგის დირექტორი',
      image: null,
      bio: 'ციფრული მარკეტინგის სპეციალისტი',
    },
  ];

  const values = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'ინოვაცია',
      description: 'მუდმივად ვეძებთ ახალ მეთოდებს და ტექნოლოგიებს სწავლების პროცესის გასაუმჯობესებლად.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'საზოგადოება',
      description: 'ვქმნით გარემოს, სადაც სტუდენტები ერთმანეთს ეხმარებიან და იზიარებენ გამოცდილებას.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'ხარისხი',
      description: 'ვთავაზობთ მხოლოდ მაღალი ხარისხის კონტენტს, რომელიც შექმნილია პროფესიონალების მიერ.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'ეფექტურობა',
      description: 'ჩვენი მეთოდოლოგია მიზნად ისახავს მაქსიმალური შედეგის მიღწევას მინიმალურ დროში.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-primary-900 py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white">ჩვენ შესახებ</h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-primary-100">
            ჩვენი მისია არის განათლების ხელმისაწვდომობა ყველასთვის
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">ჩვენი მისია</h2>
              <p className="text-lg text-gray-600 mb-4">
                Kursebi Online შეიქმნა იმ იდეით, რომ ხარისხიანი განათლება უნდა იყოს ხელმისაწვდომი ყველასთვის,
                მიუხედავად გეოგრაფიული მდებარეობისა თუ ფინანსური შესაძლებლობებისა.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                ჩვენ ვთანამშრომლობთ საუკეთესო ინსტრუქტორებთან და ინდუსტრიის ექსპერტებთან,
                რათა შევქმნათ კურსები, რომლებიც მართლაც ემსახურება სტუდენტების საჭიროებებს
                და ეხმარება მათ კარიერული მიზნების მიღწევაში.
              </p>
              <p className="text-lg text-gray-600">
                ჩვენი პლატფორმა აერთიანებს თანამედროვე ტექნოლოგიებს და ინოვაციურ სასწავლო მეთოდებს,
                რაც სწავლის პროცესს ხდის მაქსიმალურად ეფექტურს და საინტერესოს.
              </p>
            </div>
            <div className="relative h-96 bg-gray-50 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-48 h-48 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white">{stat.value}</div>
                <div className="mt-2 text-primary-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">ჩვენი ღირებულებები</h2>
            <p className="mt-4 text-lg text-gray-600">რა პრინციპები გვამოძრავებს</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-xl flex items-center justify-center text-primary-900">
                  {value.icon}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{value.title}</h3>
                <p className="mt-2 text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">ჩვენი გუნდი</h2>
            <p className="mt-4 text-lg text-gray-600">პროფესიონალები, რომლებიც ზრუნავენ შენს წარმატებაზე</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-32 h-32 mx-auto bg-primary-900 rounded-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-primary-900 font-medium">{member.role}</p>
                <p className="mt-2 text-sm text-gray-600">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">გსურს შეუერთდე ჩვენს გუნდს?</h2>
          <p className="mt-4 text-lg text-gray-300">ვეძებთ ნიჭიერ ადამიანებს, რომლებსაც სწამთ განათლების ძალა</p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-900 bg-white rounded-xl hover:bg-gray-100 transition-all"
          >
            დაგვიკავშირდი
          </Link>
        </div>
      </section>
    </div>
  );
}
