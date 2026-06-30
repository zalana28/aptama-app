import { motion } from 'framer-motion'

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0F0D] text-white"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[42%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1B7A3D]/25 blur-[100px]" />
        <div className="absolute right-[-80px] top-[-80px] h-[260px] w-[260px] rounded-full bg-[#9A8C2E]/20 blur-[80px]" />
        <div className="absolute bottom-[-100px] left-[-100px] h-[280px] w-[280px] rounded-full bg-[#1B7A3D]/15 blur-[80px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative flex w-full max-w-sm flex-col items-center px-6 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="relative"
        >
          <motion.div
            animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-[2.25rem] bg-[#1B7A3D]/35 blur-2xl"
          />
          <div className="relative grid h-36 w-36 place-items-center rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">
            <img
              src="/logos/aptama-logo.png"
              alt="Logo APTAMA"
              className="h-full w-full object-contain drop-shadow-2xl"
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="mt-8"
        >
          <h1
            className="text-[2.75rem] font-extrabold tracking-tight gradient-text"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            APTAMA
          </h1>
          <p
            className="mt-2 text-base font-semibold text-[#9A8C2E]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Daftar Hadir Kegiatan Kepemudaan
          </p>
          <p
            className="mt-1.5 text-xs tracking-wide text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Angkatan Pucanganom Tiga Muda
          </p>
        </motion.div>

        {/* Loading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#1B7A3D] border-r-[#9A8C2E]" />
          </div>
          <p
            className="text-xs font-medium text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Menyiapkan aplikasi...
          </p>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 text-[11px] text-zinc-600"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Powered by APTAMA
      </motion.p>
    </motion.div>
  )
}
