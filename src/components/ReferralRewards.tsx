import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, TrendingUp, Share2, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Reward {
  id: string;
  reward_type: string;
  reward_value: number;
  reward_status: string;
  awarded_at: string;
  expires_at: string;
  deal_shares: {
    deal_id: string;
    deals: {
      title: string;
    };
  };
}

interface ReferralRewardsProps {
  customerId: string;
}

export const ReferralRewards: React.FC<ReferralRewardsProps> = ({ customerId }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stats, setStats] = useState({ totalPoints: 0, totalShares: 0, totalConversions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRewards();
    fetchStats();
  }, [customerId]);

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select(`
          *,
          deal_shares!inner(
            deal_id,
            deals!inner(title)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: rewardsData } = await supabase
        .from('referral_rewards')
        .select('reward_value')
        .eq('customer_id', customerId)
        .eq('reward_status', 'awarded');

      const { data: sharesData } = await supabase
        .from('deal_shares')
        .select('id')
        .eq('customer_id', customerId);

      const { data: conversionsData } = await supabase
        .from('referral_conversions')
        .select('id')
        .in('share_id', (sharesData || []).map(s => s.id));

      const totalPoints = (rewardsData || []).reduce((sum, r) => sum + r.reward_value, 0);

      setStats({
        totalPoints,
        totalShares: sharesData?.length || 0,
        totalConversions: conversionsData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading rewards...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalPoints}</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Deals Shared</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalShares}</p>
              </div>
              <Share2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversions</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalConversions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Your Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No rewards yet. Start sharing deals to earn points!
            </p>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {reward.deal_shares?.deals?.title || 'Deal'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Awarded {new Date(reward.awarded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={reward.reward_status === 'awarded' ? 'default' : 'secondary'}>
                      +{reward.reward_value} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How to Earn Rewards</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <span>Share deals and earn <strong>10 points</strong> when someone calls the merchant</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <span>Earn <strong>20 points</strong> when someone navigates to the merchant</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <span>Redeem points for exclusive discounts and perks</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};