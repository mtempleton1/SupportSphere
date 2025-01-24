import { Circle } from 'lucide-react';

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  title?: string;
  status?: string;
  isActive: boolean;
  isOnline: boolean;
  avatarUrl?: string;
  Roles?: {
    name: string;
  };
}

interface TeamOverviewProps {
  teamMembers: TeamMember[];
}

export function TeamOverview({ teamMembers }: TeamOverviewProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Online Team Members</h3>
      <div className="space-y-2">
        {teamMembers
          .filter(member => member.isOnline)
          .map(member => (
            <div key={member.userId} className="bg-white rounded-lg p-4 flex items-center space-x-4">
              <div className="relative">
                {member.avatarUrl ? (
                  <img 
                    src={member.avatarUrl} 
                    alt={member.name} 
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1">
                  <Circle 
                    size={12} 
                    className={`fill-current ${member.isActive ? 'text-green-500' : 'text-yellow-500'}`}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.name}
                  </p>
                  {member.status && (
                    <span className="text-xs text-gray-500">
                      {member.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {member.title || member.Roles?.name}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
} 