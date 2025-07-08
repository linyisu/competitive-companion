import { Task } from '../../models/Task';
import { TaskBuilder } from '../../models/TaskBuilder';
import { ContestParser } from '../ContestParser';

interface Problem {
  id: number;
  title: string;
  time_limit: number;
  memory_limit: number;
  sample_input: string[];
  sample_output: string[];
  contestTitle: string; 
}

export class SZUOJContestParser extends ContestParser<Problem> {
  public getMatchPatterns(): string[] {
    return [
      'https://10-11-219-21.webvpn.sztu.edu.cn:8118/#/contest/*',
      'http://10.11.219.21/#/contest/*',
      'https://10-11-219-22.webvpn.sztu.edu.cn:8118/#/contest/*',
      'http://10.11.219.22/#/contest/*',
    ];
  }

  protected async getTasksToParse(url: string, html: string): Promise<Problem[]> {
    const realUrl = window.location.href;
    // console.log('[CPH-DEBUG] Step 1: getTasksToParse 开始执行，真实 URL:', realUrl);

    const contestIdMatch = /#\/contest\/(\d+)/.exec(realUrl);
    if (!contestIdMatch) {
        // console.error('[CPH-DEBUG] 错误：无法从真实URL中提取 contestId');
        return [];
    }
    const contestId = contestIdMatch[1];
    // console.log(`[CPH-DEBUG] 已获取比赛 ID: ${contestId}`);

    const pageUrl = new URL(realUrl.replace(/#.*/, ''));
    const apiUrl = `${pageUrl.protocol}//${pageUrl.host}/api/contests/${contestId}/`;
    // console.log(`[CPH-DEBUG] 已构造 API URL: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, { credentials: 'include' });
      // console.log('[CPH-DEBUG] fetch 请求已发送，收到的响应对象:', response);
      if (!response.ok) {
          // console.error(`[CPH-DEBUG] 错误：API 请求失败，状态码: ${response.status}`);
          return [];
      }

      const contestData = await response.json();
      // console.log('[CPH-DEBUG] 已将响应解析为 JSON 对象:', contestData);

      const problems: Problem[] = contestData.problem_json['0'];
      if (!problems || problems.length === 0) {
        // console.log('[CPH-DEBUG] 警告：题目数组为空，无法继续。');
        return [];
      }
      // console.log('[CPH-DEBUG] 已获取所有题目的原始数组:', problems);

      const contestTitle = contestData.title;
      // console.log(`[CPH-DEBUG] 已获取比赛标题: ${contestTitle}`);

      const tasksToParse = problems.map(p => ({ ...p, contestTitle }));
      // console.log('[CPH-DEBUG] Step 1 完成，将返回待解析的任务对象数组:', tasksToParse);
      return tasksToParse;
    } catch (e) {
      // console.error('[CPH-DEBUG] 在 getTasksToParse 中发生错误:', e);
      return [];
    }
  }

  protected async parseTask(problem: Problem): Promise<Task> {
    // console.log('[CPH-DEBUG] Step 2: parseTask 开始执行，处理的题目对象:', problem);
    const task = new TaskBuilder('SZUOJ');
    
    task.setName(problem.title);
    task.setCategory(problem.contestTitle);
    task.setTimeLimit(problem.time_limit * 1000);
    task.setMemoryLimit(problem.memory_limit);

    for (let i = 0; i < problem.sample_input.length; i++) {
      task.addTest(problem.sample_input[i], problem.sample_output[i]);
    }

    const builtTask = task.build();
    // console.log(`[CPH-DEBUG] Step 2 完成，为 "${problem.title}" 构建的最终任务对象:`, builtTask);
    return builtTask;
  }
}
