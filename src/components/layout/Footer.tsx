import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 mt-auto"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>© {year} QuizMaster</span>
            <span>•</span>
            <span>Built with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>using React & Supabase</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <a 
              href="#" 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacy
            </a>
            <a 
              href="#" 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Terms
            </a>
            <a 
              href="#" 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};


