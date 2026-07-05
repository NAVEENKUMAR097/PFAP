export interface UserProfile {
  displayName: string;
  initials: string;
}

/**
 * PFAP V1 is explicitly single-user (see Project Vision Document, section 3)
 * and has no authentication yet. Rather than hardcoding "Naveen" directly
 * inside Header.tsx, it's isolated here behind a typed interface — when
 * auth is introduced (roadmap: Software Development > Authentication),
 * this constant is replaced by a real AuthContext/useUser() hook and no
 * consuming component needs to change.
 */
export const CURRENT_USER: UserProfile = {
  displayName: 'Naveen',
  initials: 'NK',
};