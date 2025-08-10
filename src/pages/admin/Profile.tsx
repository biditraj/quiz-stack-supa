import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import AddQuestionPanel from "./AddQuestionPanel";

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="container py-10 space-y-6">
      <Card className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Admin Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <div><span className="font-medium">Username:</span> {user?.user_metadata?.username || user?.email}</div>
          <div><span className="font-medium">Email:</span> {user?.email}</div>
        </CardContent>
      </Card>

      <AddQuestionPanel />
    </div>
  );
}


