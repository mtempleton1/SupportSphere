import { Twitter, Facebook, Youtube, Linkedin } from "lucide-react";

export const Footer = ({
  accountName,
}: {
  accountName: string;
}) => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-8">
          <div className="text-gray-600">
            © {new Date().getFullYear()} {accountName}. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-gray-400 hover:text-gray-500"
              aria-label="Twitter"
            >
              <Twitter className="h-6 w-6" />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-gray-500"
              aria-label="Facebook"
            >
              <Facebook className="h-6 w-6" />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-gray-500"
              aria-label="YouTube"
            >
              <Youtube className="h-6 w-6" />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-gray-500"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}; 