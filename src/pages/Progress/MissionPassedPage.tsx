import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '../../components/system/PagePlaceholder';
export function MissionPassedPage() {
    const { missionSlug } = useParams();
    return (<PagePlaceholder eyebrow="Mission Passed" title={missionSlug ?? 'mission'} description={__tx("\uBBF8\uC158 \uD1B5\uACFC \uB77C\uC6B0\uD2B8(\uBD84\uC11D\uC6A9)\uC640 \uACB0\uACFC \uC694\uC57D \uD654\uBA74\uC785\uB2C8\uB2E4.")}/>);
}
