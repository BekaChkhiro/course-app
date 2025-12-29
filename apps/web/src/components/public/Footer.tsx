'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { data: settings } = useSiteSettings();

  const footerLinks = {
    important: [
      { name: 'კურსები', href: '/courses' },
      { name: 'ჩვენ შესახებ', href: '/about' },
      { name: 'კონტაქტი', href: '/contact' },
    ],
    legal: [
      { name: 'კონფიდენციალურობა', href: '/privacy-policy' },
      { name: 'წესები და პირობები', href: '/terms' },
    ],
  };

  // Format phone number for display
  const formatPhone = (phone: string) => {
    return phone || '+995 596 89 91 91';
  };

  // Format phone number for tel: link
  const formatPhoneLink = (phone: string) => {
    const cleaned = (phone || '+995596899191').replace(/\s+/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const contactInfo = [
    {
      label: 'ელ-ფოსტა',
      value: settings?.email || 'info@kursebi.online',
      href: `mailto:${settings?.email || 'info@kursebi.online'}`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'ტელეფონი',
      value: formatPhone(settings?.phone),
      href: `tel:${formatPhoneLink(settings?.phone)}`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
  ];

  // Social links with fallbacks
  const socialLinks = [
    {
      name: 'Facebook',
      href: settings?.facebookUrl || 'https://www.facebook.com/share/1BshHTH1D8/?mibextid=wwXIfr',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      href: settings?.instagramUrl || 'https://www.instagram.com/kursebi.online?igsh=OW83M3UzZWE5aHkw&utm_source=qr',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'TikTok',
      href: settings?.tiktokUrl || 'https://www.tiktok.com/@officeskillsacademy?_r=1&_t=ZS-92GSAdJuWIf',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-4">
              <Link href="/" className="flex items-center justify-center sm:justify-start">
                <Image
                  src="/kursebi-logo.png"
                  alt="Kursebi Online"
                  width={180}
                  height={44}
                  className="h-10 w-auto brightness-0 invert"
                />
              </Link>
            </div>

            {/* Social Links */}
            <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-3">
              <span className="text-sm text-gray-400">სოციალური მედია</span>
              <div className="flex items-center justify-center sm:justify-end gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-white/15 text-gray-300 hover:text-white hover:border-white/40 transition-colors"
                  >
                    <span className="sr-only">{social.name}</span>
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 text-center sm:text-left">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-100">საკონტაქტო ინფორმაცია</h3>
              <div className="mt-4 space-y-4">
                {contactInfo.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex flex-col sm:flex-row items-center sm:items-start gap-2 rounded-xl bg-white/5 py-3 px-4 hover:bg-white/10 transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                      {item.icon}
                    </span>
                    <div className="text-center sm:text-left">
                      <span className="block text-xs text-gray-400 uppercase tracking-wide">{item.label}</span>
                      <span className="text-base font-semibold text-white">{item.value}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Important Links */}
            <div className="rounded-2xl border border-white/10 p-5 sm:p-6 text-center sm:text-left">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-100">საჭირო ბმულები</h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.important.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div className="rounded-2xl border border-white/10 p-5 sm:p-6 text-center sm:text-left">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-100">სამართლებრივი</h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} Kursebi Online. ყველა უფლება დაცულია.
            </p>
            <a
              href="https://infinity.ge/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <span>Powered by</span>
              <Image
                src="/infinity-logo.webp"
                alt="Infinity Solutions"
                width={100}
                height={24}
                className="h-5 w-auto"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
