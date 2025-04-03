import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Bot } from 'lucide-react';

export function Header() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-8"
    >
      <div className="flex items-center gap-6">
        <motion.div
          className="relative"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20 
          }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-02 via-orange-03 to-orange-04 p-[2px]">
            <div className="w-full h-full rounded-full bg-gray-05 flex items-center justify-center overflow-hidden">
              <Bot className="w-8 h-8 text-orange-03" />
            </div>
          </div>
          <motion.div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-03 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FileText className="w-3 h-3 text-gray-05" />
          </motion.div>
        </motion.div>

        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl text-gray-01 mb-1">
              Garbo AI
            </h1>
            <p className="text-gray-02">
              By Klimatkollen
            </p>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute -z-10 top-0 -left-4 w-24 h-24 bg-orange-03/10 rounded-full blur-xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.div
        className="absolute -z-10 -top-4 left-8 w-16 h-16 bg-blue-03/10 rounded-full blur-xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4 }}
      />
    </motion.div>
  );
}