import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = (profile as any).sub;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).googleId = token.googleId;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
